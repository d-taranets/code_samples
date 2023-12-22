import Bookshelf from "../lib/Bookshelf";
import EmployeeEducation from './EmployeeEducation';
import Skill from './Skill';
import EmployeeSkill from './EmployeeSkill';
import Experience from "./Experience";
import pipl from "../lib/Pipl";

class Employee extends Bookshelf.Model {
    get tableName () {
        return `${process.env.DB_SCHEMA || 'public'}.employee`
    }

    get hasTimestamps() {
        return false;
    }

    async verifyPhoneByEmail (email) {
        const phone = this.get('phone');
        const phoneChecked = this.get('phonechecked', false);
        try {
            if(!phone && email && !phoneChecked) {
                const phones = await pipl.getPhones({
                    email,
                    firstName: this.get('firstname'),
                    lastName: this.get('lastname'),
                    location: this.get('location'),
                    linkedInUrl: this.get('linkedinurl')
                }).then(list =>  list.join(',') );
                if(phones){
                    this.set('phone', phones)
                }
                this.set('phonechecked', true);
                await this.save();
            }
        } catch (e) {
            console.log(e);
        }
        return this;
    };

    experiences () {
        return this.hasMany(Experience, 'employeeid')
    }

    education () {
        return this.hasMany(EmployeeEducation, 'employeeid')
    }

    skills () {
        return this.belongsToMany(Skill)
            .through(EmployeeSkill)
    }

    static async pushDocs (instances) {
        return this.updateDocs(instances)
    };

    static async removeDocs (instances) {
        await Employee.removeRelatedExperiences(instances)

        return Promise.all(promises);
    };

    static async updateDocs (instances) {
        await Employee.updateRelatedExperiences(instances);
        return instances;
    };

    static async removeRelatedExperiences (instances) {
        const idsSet = new Set();
        instances.forEach(instance => {
            idsSet.add(instance.get('id'))
        });
        // transform set to array
        const employeeids = Array.from(idsSet);
        const experiences = await Experience
            .where('employeeid', 'in', employeeids);
        return Experience.removeDocs(experiences)
    }

    static async updateRelatedExperiences (instances) {
        const idsSet = new Set();
        instances.forEach(instance => {
            idsSet.add(instance.get('id'))
        });
        // transform set to array
        const employeeids = Array.from(idsSet);
        const experiences = await Experience
            .where('employeeid', 'in', employeeids)
            .fetchAll({withRelated: 'employee'});
        return Experience.pushDocs(experiences)
    }
}

export default Bookshelf.model('Employee', Employee);